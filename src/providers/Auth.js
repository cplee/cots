import React, {useState} from 'react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import { Auth } from "aws-amplify";
import CircularProgress from '@material-ui/core/CircularProgress';
import ReactGA from 'react-ga';

const useStyles = makeStyles(theme => ({
  root: {
  },
  alert: {
    marginTop: theme.spacing(2),
  },
  authForm: {
    marginTop: '20%',
    padding: theme.spacing(6)
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  buttonProgress: {
    color: 'white',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  buttonWrapper: {
    margin: theme.spacing(1),
    position: 'relative',
  },
}));

function ProviderAuth(props) {
  const classes = useStyles();
  const [creds, setCreds] = useState({});
  const [forgotStarted, setForgotStarted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (e) => {
    setCreds({...creds, username: e.target.value.toLowerCase().trim()});
  }
  const handlePasswordChange = (e) => {
    setCreds({...creds, password: e.target.value});
  }
  const handleCodeChange = (e) => {
    setCreds({...creds, code: e.target.value.trim()});
  }

  const handleAuthError = (e) => {
    ReactGA.exception({description: e.message});
    console.error({...e, cognitoUser: {email: creds.username}}); 
    setError(e.message);
  };

  const navigateSignIn = () => {
    setError('');
    props.onStateChange('signIn',{});
  };
  const navigateSignUp = () => {
    setError('');
    props.onStateChange('signUp',{});
  };
  const navigateForgotPassword = () => {
    setError('');
    props.onStateChange('forgotPassword',{});
  };
  const navigateResendCode = () => {
    setError('');
    Auth.resendSignUp(creds.username)
    .then(() => console.log('code resent'))
    .catch(handleAuthError);
  };

  const doSignUp = (e) => {
    e.preventDefault()
    setLoading(true);
    const signup_info = {
      username: creds.username,
      password: creds.password,
      attributes: {},
    }
    setError('');
    Auth.signUp(signup_info)
      .then(data => {
        props.onStateChange('confirmSignUp', data.user.username);
      })
      .then(() => ReactGA.event({category: 'Therapist', action: 'Sign Up'}))
      .catch(handleAuthError)
      .finally(() => setLoading(false));
  };
  const doSignUpConfirm = (e) => {
    e.preventDefault()
    setLoading(true);
    setError('');
    Auth.confirmSignUp(creds.username, creds.code)
      .then(() => props.onStateChange('signedUp'))
      .then(() => ReactGA.event({category: 'Therapist', action: 'Confirm Sign Up'}))
      .then(() => doSignIn())
      .catch(handleAuthError)
      .finally(() => setLoading(false));
  };
  const doForgotPassword = (e) => {
    e.preventDefault()
    setLoading(true);
    setError('');
    Auth.forgotPassword(creds.username)
      .then(() => setForgotStarted(true))
      .then(() => ReactGA.event({category: 'Therapist', action: 'Forgot Password'}))
      .catch(handleAuthError)
      .finally(() => setLoading(false));
  }
  const doForgotPasswordSubmit = (e) => {
    e.preventDefault()
    setLoading(true);
    setError('');
    Auth.forgotPasswordSubmit(creds.username, creds.code, creds.password)
      .then(() => {
        setForgotStarted(false);
        doSignIn(e);
      })
      .then(() => ReactGA.event({category: 'Therapist', action: 'Forgot Password Submit'}))
      .catch(handleAuthError)
      .finally(() => setLoading(false));
  }
  const doSignIn = (e) => {
    if (e !== undefined) {
      e.preventDefault()
    }
    setLoading(true);
    setError('');
    Auth.signIn(creds.username, creds.password)
        .then(user => {
          if (
            user.challengeName === 'SMS_MFA' ||
            user.challengeName === 'SOFTWARE_TOKEN_MFA'
          ) {
            console.log('confirm user with ' + user.challengeName);
            props.onStateChange('confirmSignIn', user);
          } else if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
            console.log('require new password', user.challengeParam);
            props.onStateChange('requireNewPassword', user);
          } else if (user.challengeName === 'MFA_SETUP') {
            console.log('TOTP setup', user.challengeParam);
            props.onStateChange('TOTPSetup', user);
          } else if (
            user.challengeName === 'CUSTOM_CHALLENGE' &&
            user.challengeParam &&
            user.challengeParam.trigger === 'true'
          ) {
            console.log('custom challenge', user.challengeParam);
            props.onStateChange('customConfirmSignIn', user);
          } else {
            Auth.verifiedContact(user).then(data => {
              if (Object.keys(data.verified).length !== 0) {
                ReactGA.set({ userId: creds.username });
                props.onStateChange('signedIn', user);
              } else {
                user = Object.assign(user, data);
                props.onStateChange('verifyContact', user);
              }
            });
          }
        })
        .then(() => ReactGA.event({category: 'Therapist', action: 'Sign In'}))
        .catch((e) => {
          if(e.code === "UserNotConfirmedException") {
            console.log('Tried to sign-in with unconfirmed user.  Initiate confirmation.');
            props.onStateChange('confirmSignUp', { username: creds.username });
          } else {
            handleAuthError(e);
          }
        })
        .finally(() => setLoading(false));
  };

  const renderSignIn = () => {
    return (
      <AuthForm title="Therapist Sign In" onSubmit={doSignIn} error={error}>
        <Grid container spacing={3} justify="center">
          <Grid item xs={12} align="left">
              <TextField fullWidth required id="email" label="Email"  variant="outlined" 
                          defaultValue={creds.username}
                          name="email"
                          autoFocus={true}
                          autoComplete="email"
                          onChange={handleUsernameChange}/>
          </Grid>
          <Grid item xs={12} align="left">
              <TextField fullWidth required id="password" label="Password"  variant="outlined" 
                          type="password"
                          defaultValue={creds.password}
                          autoComplete="new-password"
                          onChange={handlePasswordChange}/>
              <Typography variant="caption">Forgot your password? <Link onClick={navigateForgotPassword}>Reset password</Link></Typography>
          </Grid>
          <Grid item xs={8} align="center">
            <Typography variant="caption">No account? <Link onClick={navigateSignUp}>Create account</Link></Typography>
          </Grid>
          <Grid item xs={4} align="center">
            <div className={classes.buttonWrapper}>
              <Button variant="contained" color="primary" type="submit" disabled={loading}>Sign In</Button>
              {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
            </div>
          </Grid>
        </Grid>
      </AuthForm>
    );
  };

  const renderSignUp = () => {
    return (
      <Container maxWidth="md">
       <Paper className={classes.root}>
        <Typography variant="h2" component="h2" className={classes.title}>
          - Therapists, Please Join Us! - 
        </Typography>
        <Container maxWidth="md" align="center">
          <br/>
          <Typography>
           During this pandemic, we are gratefully adding more therapists who are willing to offer short-term (minimum four sessions per accepted referral) pro-bono sessions, and those willing to accept fees of $50 or less to our network. 
          </Typography>
          <br/>
          <Typography>
		  Therapists, we would love for you to join us! At this time, we require each clinician to be licensed for independent clinical practice and have their own malpractice insurance.<br/>
If you aren’t yet licensed for independent clinical private practice, please stop and have the practice owner you work for complete a therapist profile instead.<br/>
	    Before you create a profile, we ask that you please read our <Link href='https://www.coronavirusonlinetherapy.com/therapist-portal-faq'>Therapist Portal FAQ</Link> to ensure an easy signup process.
          </Typography>
	   <br/>
	  <Typography>
	  	  At this time we are only accepting licensed, insured clinicians who are authorized for clinical private practice by their state board(s). We are unable to accept associates and interns who are NOT licensed and authorized to conduct clinical private practice. This includes AMFT's. We instead ask that you have your supervisors enroll, so that they may refer you clients under their private practices, and supervision, at their sole discretion. Thank you.
	  </Typography>
        </Container>
		  <AuthForm title="Therapist Registration" onSubmit={doSignUp} error={error}>
			<Grid container spacing={3} justify="center">
			  <Grid item xs={12} align="left">
				  <TextField fullWidth required id="email" label="Office Email"  variant="outlined" 
							  defaultValue={creds.username}
                name="email"
							  autoFocus={true}
							  autoComplete="email"
							  onChange={handleUsernameChange}/>
			  </Grid>
			  <Grid item xs={12} align="left">
				  <TextField fullWidth required id="password" label="Password"  variant="outlined" 
							  type="password"
							  defaultValue={creds.password}
							  autoComplete="new-password"
							  onChange={handlePasswordChange}/>
			  </Grid>
			  <Grid item xs={8} align="center">
				<Typography variant="caption">Already registered? <Link onClick={navigateSignIn}>Sign in</Link></Typography>
			  </Grid>
			  <Grid item xs={4} align="center">
				<div className={classes.buttonWrapper}>
				  <Button variant="contained" color="primary" type="submit" disabled={loading}>Register</Button>
				  {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
				</div>
			  </Grid>
			</Grid>
		  </AuthForm>
		 </Paper>
		</Container>  
    );
  };
  const renderConfirmSignUp = () => {
    return (
      <AuthForm title="Check Email for Confirmation Code" onSubmit={doSignUpConfirm} error={error}>
        <Grid container spacing={3} justify="center">
          <Grid item xs={12} align="left">
              <TextField fullWidth id="email" label="Email"  variant="outlined" 
                          style={{display:'none'}}/>
              <TextField fullWidth required id="code" label="Confirmation Code"  variant="outlined" 
                          defaultValue={creds.code}
                          name="code"
                          autoFocus={true}
                          autoComplete="none"
                          type="search"
                          onChange={handleCodeChange}/>
              <Typography variant="caption">Lost your code? <Link onClick={navigateResendCode}>Resend Code</Link></Typography>
          </Grid>
          <Grid item xs={8} align="center">
            <Typography variant="caption"><Link onClick={navigateSignIn}>Back to Sign In</Link></Typography>
          </Grid>
          <Grid item xs={4} align="center">
            <div className={classes.buttonWrapper}>
              <Button variant="contained" color="primary" type="submit" disabled={loading}>Confirm</Button>
              {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
            </div>
          </Grid>
        </Grid>
      </AuthForm>
    );
  };
  const renderForgotPassword = () => {
    return (
      <AuthForm title="Reset Your Password" onSubmit={doForgotPassword} error={error}>
        <Grid container spacing={3} justify="center">
          <Grid item xs={12} align="left">
              <TextField fullWidth required id="email" label="Office Email"  variant="outlined" 
                    defaultValue={creds.username}
                    name="email"
                    autoFocus={true}
                    autoComplete="email"
                    onChange={handleUsernameChange}/>
          </Grid>
          <Grid item xs={8} align="center">
            <Typography variant="caption"><Link onClick={navigateSignIn}>Back to Sign In</Link></Typography>
          </Grid>
          <Grid item xs={4} align="center">
            <div className={classes.buttonWrapper}>
              <Button variant="contained" color="primary" type="submit" disabled={loading}>Send Code</Button>
              {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
            </div>
          </Grid>
        </Grid>
      </AuthForm>
    );
  };
  const renderForgotPasswordSubmit = () => {
    return (
      <AuthForm title="Reset Your Password" onSubmit={doForgotPasswordSubmit} error={error}>
        <Grid container spacing={3} justify="center">
          <Grid item xs={12} align="left">
              <TextField fullWidth id="email" label="Email"  variant="outlined" 
                          style={{display:'none'}}/>
              <TextField fullWidth required id="code" label="Confirmation Code"  variant="outlined" 
                          defaultValue={creds.code}
                          name="code"
                          autoFocus={true}
                          autoComplete="none"
                          type="search"
                          onChange={handleCodeChange}/>
          </Grid>
          <Grid item xs={12} align="left">
              <TextField fullWidth required id="password" label="New Password"  variant="outlined" 
                          type="password"
                          defaultValue={creds.password}
                          autoComplete="new-password"
                          onChange={handlePasswordChange}/>
          </Grid>
          <Grid item xs={8} align="center">
              <Typography variant="caption">Lost your code? <Link onClick={doForgotPassword}>Resend Code</Link></Typography>
          </Grid>
          <Grid item xs={4} align="center">
            <div className={classes.buttonWrapper}>
              <Button variant="contained" color="primary" type="submit" disabled={loading}>Confirm</Button>
              {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
            </div>
          </Grid>
        </Grid>
      </AuthForm>
    );
  };

  switch(props.authState) {
    case 'signIn': return renderSignIn();
    case 'signedOut': return renderSignIn();
    case 'signUp': return renderSignUp();
    case 'confirmSignUp': return renderConfirmSignUp();
    case 'forgotPassword': return !forgotStarted?renderForgotPassword():renderForgotPasswordSubmit();
    case 'signedUp': {
      return null
    }
    case 'signedIn': {
      if(Object.keys(creds).length > 0) {
        setCreds({});
      }
      return null
    }

    default: return null;
  }
}

function AuthForm(props) {
  const classes = useStyles();
  return (
    <Container maxWidth="sm" className={classes.root}> 
      <Paper className={classes.authForm}>
        <Typography className={classes.title} align="left" variant="h5">
          {props.title}
        </Typography>
        <form autoComplete="off" onSubmit={props.onSubmit}>
          {props.children}
        </form>
        {props.error && <Alert severity="error" className={classes.alert}>{props.error}</Alert>}
      </Paper>
    </Container>
  );
}

export default ProviderAuth;
