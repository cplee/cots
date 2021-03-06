import React, {useState, useEffect}  from 'react';
import ReactGA from 'react-ga';
import { Analytics } from 'aws-amplify';

import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Hidden from '@material-ui/core/Hidden';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';
import SearchIcon from '@material-ui/icons/Search';
import CircularProgress from '@material-ui/core/CircularProgress';


import Referral from './Referral';
import ProviderList from './List';
import TermsOfService from '../common/TermsOfService';
import AcceptTerms from '../common/AcceptTerms';
import StateSelect from '../common/StateSelect';
import RateSelect from '../common/RateSelect';
import InsuranceInput from '../common/InsuranceInput';
import GenderSelect from '../common/GenderSelect';
import LanguagesInput from '../common/LanguagesInput';
import ModalityInput from '../common/ModalityInput';
import SpecializationInput from '../common/SpecializationInput';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  title: {
    margin: theme.spacing(3),
  },
  divider:{
    margin: theme.spacing(3),
  },
  search:{
    margin: theme.spacing(1),
  },
  buttonProgress: {
    color: 'white',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  wrapper: {
    margin: theme.spacing(1),
    position: 'relative',
  },
}));


function App() {
  const classes = useStyles();
  const [query, setQuery] = useState({});
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    let isValid = (query.state && query.tosAcceptedAt && query.rate !== undefined);
    if(!isValid) {
      setProviders(null);
      return;
    }
    new Referral(query).execute().then(plist => {
      const resultCount = plist.length;
      const averageScore = resultCount?(plist.reduce((score, p) => score + p.score, 0) / resultCount):0;
      const qattrs = Object.entries(query).filter(([k,v]) => k !== 'tosAcceptedAt').reduce((q,[k,v]) => {
        q[k] = v.toString();
        return q;
      },{});
      setProviders(plist);
      Analytics.record({
        name: 'referral', 
        attributes: qattrs,
        metrics: { resultCount, averageScore },
      });
      ReactGA.event({category: 'Client', action: 'Referral', label: query.state, value: averageScore});
    });
  }, [query, setProviders]);

  return (
    <Container maxWidth="md">
      <Paper className={classes.root}>
        <Typography variant="h2" className={classes.title}>
          Find a Therapist 
        </Typography>
        <Typography variant="h6">
          IF YOU ARE FEELING SUICIDAL, CALL 911 
        </Typography>
        <Typography>
          or The National Suicide Hotline:  1-800-273-8255  
        </Typography>
        {providers == null && 
          <Container maxWidth="md" align="center">
            <br/>
            <Typography>
            Please note that we are not equipped to assist in emergencies. Online therapy may not be appropriate for everyone, and we cannot match you with one of our online therapists if you are actively suicidal.          </Typography>
            <br/>
            <Typography>
              THIS SERVICE IS PRESENTLY FOR FRONT LINE WORKERS/ESSENTIAL EMPLOYEES ONLY
            </Typography>
            <br/>
            <Typography>
              Not sure if you qualify?  Visit out <Link href='https://www.coronavirusonlinetherapy.com/faq'>FAQ</Link> to learn more.
            </Typography>
          </Container>
        }
        <Divider className={classes.divider}/>
        <Container className={classes.search}>
          {providers === null && <ProviderQuery query={query} onChange={setQuery}/>}
          {providers !== null && 
            <Container>
             <Button  variant="contained" color="primary" onClick={() => {setProviders(null)}}><SearchIcon/> Refine Search</Button>
             <ProviderList providers={providers}/>
            </Container>
          }
        </Container> 
      </Paper>
    </Container>
  );
}

function ProviderQuery(props) {
  const classes = useStyles();
  const [query, setQuery] = useState(props.query);
  const [loading, setLoading] = React.useState(false);

  const handleChange = field => {
    return (event, value) => {
      const newQuery = {...query};
      if(value !== undefined) {
        newQuery[field] = value===''?undefined:value;
      } else if (event.target !== undefined) {
        newQuery[field] = event.target.value===''?undefined:event.target.value;
      } else {
        newQuery[field] = event===''?undefined:event;
      }
      setQuery(newQuery);
    }
  };
  const handleSearch = () => {
    setLoading(true);
    if(props.onChange) {
      props.onChange({...query});
    }
  };
  const isQueryValid = () => {
    let isValid = (query.state && query.tosAcceptedAt && query.rate !== undefined);
    return isValid;
  }
  return (
    <div className={classes.root}>
      <Grid container spacing={0}>
        <Grid item xs={5} align="left">
          <Grid container spacing={0}>
            <Grid item xs={12} align="left" className={classes.search}>
              <StateSelect defaultValue={query.state} onChange={handleChange('state')}/>
            </Grid>
            <Grid item xs={12} align="left" className={classes.search}>
              <Hidden smUp> 
                <InsuranceInput max={1} 
                                defaultValue={query.acceptedInsurance}
                                onChange={handleChange('acceptedInsurance')}
                                label='Insurance' 
                                helperText='Optional: only enter if you wish to utilize your health insurance benefits'/>
              </Hidden>
              <Hidden xsDown>
                <InsuranceInput max={1} 
                                defaultValue={query.acceptedInsurance}
                                onChange={handleChange('acceptedInsurance')}
                                label='Health Insurance' 
                                helperText='Optional: only enter if you wish to utilize your health insurance benefits'/>
              </Hidden>
            </Grid>
            <Grid item xs={12} align="left" className={classes.search}>
              <Hidden smUp> 
                <GenderSelect onChange={handleChange('gender')}
                              defaultValue={query.gender}
                              required={false}
                              label='Gender' 
                              helperText='Optional: choose preferred gender identification of therapist'/>
              </Hidden>
              <Hidden xsDown>
                <GenderSelect onChange={handleChange('gender')}
                              defaultValue={query.gender}
                              required={false}
                              label='Preferred Gender Identification' 
                              helperText='Optional: choose preferred gender identification of therapist'/>
              </Hidden>
            </Grid>
            <Grid item xs={12} align="left" className={classes.search}>
              <SpecializationInput onChange={handleChange('specializations')}
                                   defaultValue={query.specializations}
                                   helperText='Optional: choose preferred specialties of a therapist'/>
            </Grid>
            <Grid item xs={12} align="left" className={classes.search}>
              <ModalityInput onChange={handleChange('modalities')}
                             defaultValue={query.modalities}
                             helperText='Optional: choose preferred types of therapy'/>
            </Grid>
            <Grid item xs={12} align="left" className={classes.search}>
              <LanguagesInput onChange={handleChange('languages')}
                              defaultValue={query.languages}
                              helperText='Optional: choose preferred languages spoken'/>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={7}>
          <Grid container spacing={0}>
            <Grid item xs={12} align="left" className={classes.search}>
              <RateSelect onChange={handleChange('rate')} 
                          defaultValue={query.rate}
                          label='Highest fee I can afford at this time is:'/>
            </Grid>
            <Grid item xs={12} align="center" className={classes.search}>
              <AcceptTerms required={true} 
                           defaultValue={query.tosAcceptedAt}
                           onChange={handleChange('tosAcceptedAt')} 
                           contract={TermsOfService}/>
            </Grid>
            <Grid item xs={12} align="center" className={classes.search}>
              <div className={classes.wrapper}>
                <Button variant="contained" color="primary" type="submit" disabled={!isQueryValid(query)} onClick={handleSearch}><SearchIcon/> Search</Button>
                {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
              </div>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}

export default App;

